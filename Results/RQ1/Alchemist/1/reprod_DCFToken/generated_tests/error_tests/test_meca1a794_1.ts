import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - distributeAmount arithmetic change", function () {
  it("should kill mutant meca1a794 by expecting revert on distributeToken when balance is between mutant and original distributeAmount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const liquidityReceiveAddress = addr1.address;
    
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Set the caller (cfo) to owner so we can call distributeToken
    await instance.setCaller(owner.address);
    
    // Set a distribute address
    await instance.setDistributeAddress(addr1.address);
    
    // Calculate the mutant distributeAmount: 2000 + 1e18 = 1000000000000000002000
    const mutantDistributeAmount = ethers.parseEther("1") + BigInt(2000);
    // Calculate the original distributeAmount: 2000 * 1e18 = 2000000000000000000000
    const originalDistributeAmount = ethers.parseEther("2000");
    
    // Fund the contract with an amount greater than mutant value but less than original value
    // For example: mutantDistributeAmount + 1000 (just above mutant threshold)
    const fundAmount = mutantDistributeAmount + BigInt(1000);
    
    // Transfer tokens to the contract itself to simulate balance
    await instance.transfer(await instance.getAddress(), fundAmount);
    
    // Verify contract has enough balance for mutant but not for original
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    expect(contractBalance).to.equal(fundAmount);
    expect(contractBalance >= mutantDistributeAmount).to.be.true;
    expect(contractBalance < originalDistributeAmount).to.be.true;
    
    // This should revert in the original (insufficient balance for 2000 * 1e18)
    // But in the mutant, it will succeed because mutant requires only 2000 + 1e18
    // which the contract has, thus killing the mutant
    await expect(
      instance.distributeToken()
    ).to.be.revertedWith("Insufficient token balance");
  });
});