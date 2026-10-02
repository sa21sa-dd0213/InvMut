import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m13e3e7eb - OR instead of AND in Collect", function () {
  it("should kill the mutant by exploiting the OR logic to bypass unlock time check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    const bankAddress = await bankInstance.getAddress();
    
    // Fund addr1 with enough ETH to put into the bank
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("2.0")
    });
    
    // Set the minimum sum to 1 ether (default)
    const minSum = ethers.parseEther("1.0");
    
    // addr1 puts 1.5 ether into the bank with a far future unlock time (block.timestamp + 100000)
    const futureTime = (await ethers.provider.getBlock("latest"))!.timestamp + 100000;
    await bankInstance.connect(addr1).Put(futureTime, { value: ethers.parseEther("1.5") });
    
    // Check that the balance is set correctly
    const holderInfo = await bankInstance.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(ethers.parseEther("1.5"));
    expect(holderInfo.unlockTime).to.equal(futureTime);
    
    // Now attempt to Collect with a small amount (0.1 ether) - should revert in original
    // because unlock time has not passed, but in mutant it should succeed because
    // acc.balance >= MinSum (1.5 >= 1.0) makes the first condition of the OR true
    
    const collectAmount = ethers.parseEther("0.1");
    
    // In the original contract this would revert because all three conditions must be true
    // In the mutant, the OR allows it to pass if balance >= MinSum (which it is)
    await bankInstance.connect(addr1).Collect(collectAmount);
    
    // Verify that the balance decreased (mutant allowed the withdrawal)
    const holderInfoAfter = await bankInstance.Acc(addr1.address);
    expect(holderInfoAfter.balance).to.equal(ethers.parseEther("1.4")); // 1.5 - 0.1
    
    // If we reached here, the mutant allowed a withdrawal that should not have been allowed
    // This confirms the mutant is killed (it behaves differently than original)
  });
});