import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - mb1c4f481", function () {
  it("should kill the mutant by depositing more than MinSum and collecting a valid amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    
    // Deposit 2 ether (greater than MinSum) from addr1
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify balance is 2 ether (greater than MinSum)
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to collect 0.5 ether (valid amount, less than balance)
    const collectAmount = ethers.parseEther("0.5");
    
    // This should succeed on original (balance >= MinSum) 
    // but revert on mutant (balance == MinSum, and 2 != 1)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});