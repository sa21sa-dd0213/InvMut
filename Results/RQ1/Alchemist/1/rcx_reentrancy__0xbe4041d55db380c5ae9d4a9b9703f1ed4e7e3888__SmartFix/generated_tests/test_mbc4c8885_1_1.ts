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

    // Deploy a contract that rejects incoming ETH (using inline bytecode)
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the rejector contract via MONEY_BOX (using Put)
    await moneyBox.connect(owner).put(0, { value: ethers.parseEther("1.0") });

    // First, transfer ownership of the balance to the rejector contract
    await owner.sendTransaction({
      to: await rejector.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Deploy a contract that can call Collect and reverts on receive
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
    await moneyBox.connect(owner).put(0, { value: ethers.parseEther("1.0") });

    // Wait for unlock time to pass (lock time was 0)
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Have caller try to collect - this should revert because caller rejects ETH
    await expect(
      caller.getFunction("callCollect")(
        await moneyBox.getAddress(),
        ethers.parseEther("0.3")
      )
    ).to.be.reverted;
  });
});