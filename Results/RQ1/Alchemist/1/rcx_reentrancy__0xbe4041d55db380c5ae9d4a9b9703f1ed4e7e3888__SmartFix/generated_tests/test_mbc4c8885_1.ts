import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - mbc4c8885", function () {
  it("should revert when Collect is called from a contract that rejects ETH, but mutant passes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (no constructor args)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MONEY_BOX (no constructor args based on the contract code)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();
    
    // Setup: Initialize the contract
    await moneyBox.setMinSum(ethers.parseEther("0.1"));
    await moneyBox.setLogFile(await log.getAddress());
    await moneyBox.initialized();
    
    // Deploy a contract that rejects incoming ETH
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the rejector contract via MONEY_BOX (using Put)
    await moneyBox.connect(owner).put(0, { value: ethers.parseEther("1.0") });
    
    // Now try to collect from the rejector contract
    // The original contract should revert because the call to rejector fails
    // The mutant with `if (true)` will not revert, allowing the balance deduction
    
    // First, transfer ownership of the balance to the rejector contract
    // We can't transfer directly, so we'll use the rejector as msg.sender
    // Need to call Put from rejector first to give it balance
    await owner.sendTransaction({
      to: await rejector.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Put ETH into MONEY_BOX from the rejector contract
    // This requires the rejector to have a function to call Put
    // Since we can't modify the rejector, let's use a different approach
    
    // Alternative: Use addr1 as a regular address that will succeed
    // Then test that the mutant would incorrectly handle a failing call
    // The key is: the mutant will never revert on failed external calls
    
    // Let's test the behavior directly: call Collect with an amount that should succeed
    // but verify that the balance is correctly deducted
    await moneyBox.connect(owner).put(0, { value: ethers.parseEther("1.0") });
    
    // Wait for unlock time to pass (lock time was 0)
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);
    
    // This should succeed in both original and mutant
    await moneyBox.connect(owner).collect(ethers.parseEther("0.5"));
    
    // The real test: verify that a contract that rejects ETH would cause revert in original
    // but pass in mutant. Since we can't deploy a contract that calls Collect easily,
    // we test the mutant's behavior by checking that it doesn't revert when it should
    
    // Actually, the simplest approach: deploy a contract that can call Collect and reverts on receive
    const CallerFactory = await ethers.getContractFactory(
      "contract Caller { function callCollect(address target, uint amount) public { (bool ok,) = target.call(abi.encodeWithSignature(\"collect(uint256)\", amount)); require(ok, \"call failed\"); } receive() external payable { revert(); } }"
    );
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();
    
    // Fund the caller in MONEY_BOX
    await owner.sendTransaction({
      to: await caller.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Have caller put money into MONEY_BOX
    await caller.getFunction("callCollect")(
      await moneyBox.getAddress(),
      ethers.parseEther("0.5")
    );
    
    // The call to Collect from caller will fail because caller rejects ETH
    // In the original, this reverts; in the mutant, it doesn't
    // So we expect revert for the original behavior
    await expect(
      caller.getFunction("callCollect")(
        await moneyBox.getAddress(),
        ethers.parseEther("0.3")
      )
    ).to.be.reverted;
  });
});