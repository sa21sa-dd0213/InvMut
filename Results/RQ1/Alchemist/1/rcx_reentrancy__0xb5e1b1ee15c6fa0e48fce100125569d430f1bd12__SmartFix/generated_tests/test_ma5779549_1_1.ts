import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant ma5779549 - CashOut revert removal", function () {
  it("should revert when cash out to a rejecting contract, preserving balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deploy a contract that rejects incoming ether
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Send minimum deposit to owner's balance
    const depositAmount = ethers.parseEther("2");
    await owner.sendTransaction({
      to: await bank.getAddress(),
      value: depositAmount
    });
    
    // Check owner has balance
    const balanceBefore = await bank.balances(owner.address);
    expect(balanceBefore).to.equal(depositAmount);
    
    // Attempt to cash out to the rejecting contract - should revert in original
    await expect(
      bank.connect(owner).CashOut(depositAmount, { gasLimit: 100000 })
    ).to.be.reverted;
    
    // Verify balance is preserved (unchanged)
    const balanceAfter = await bank.balances(owner.address);
    expect(balanceAfter).to.equal(depositAmount);
  });
});