import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant test - mee8efc09", function () {
  it("should revert when depositing below MinDeposit in original contract, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy PrivateBank with Log contract address
    const Factory = await ethers.getContractFactory("PrivateBank");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Verify MinDeposit is 1 ether
    expect(await instance.MinDeposit()).to.equal(ethers.parseEther("1"));
    
    // Attempt to deposit 0.5 ether (below minimum)
    const depositAmount = ethers.parseEther("0.5");
    
    // The original contract should revert because msg.value < MinDeposit
    // The mutant with "if(true)" will NOT revert and will accept the deposit
    await expect(
      instance.connect(addr1).Deposit({ value: depositAmount })
    ).to.be.reverted;
    
    // Additional verification: balance should remain 0 if reverted
    expect(await instance.balances(addr1.address)).to.equal(0);
  });
});