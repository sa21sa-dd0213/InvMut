import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant kill test - mc535433c", function () {
  it("should kill the mutant by withdrawing exactly the balance amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Deposit exactly 1 ether (which equals MinSum = 1 ether)
    const depositAmount = ethers.parseEther("1");
    const tx1 = await bank.connect(addr1).Put(0, { value: depositAmount });
    await tx1.wait();
    
    // Verify balance is exactly 1 ether
    const holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Advance time past the unlockTime (unlockTime = block.timestamp since we used _unlockTime=0)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to withdraw exactly 1 ether
    // In the original contract this succeeds (balance >= _am)
    // In the mutant this should fail (balance > _am is false since balance == _am)
    await expect(
      bank.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});