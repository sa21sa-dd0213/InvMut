import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m45e4f147 - distributeTokenPeriodic", function () {
  it("should revert with 'Insufficient token balance' when contract balance is less than distributeAmount", async function () {
    const [owner, cfo, distributeAddr] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Set the CFO (caller) address
    await instance.setCaller(cfo.address);
    
    // Set the distribute address
    await instance.connect(cfo).setDistributeAddress(distributeAddr.address);
    
    // Get the distribute amount (2000 * 1e18)
    const distributeAmount = ethers.parseEther("2000");
    
    // Ensure the contract has less than distributeAmount tokens
    // The contract was deployed with 2,000,000 tokens minted to owner
    // No tokens are in the contract initially, so balance should be 0
    
    // Attempt to call distributeTokenPeriodic
    // This should revert with "Insufficient token balance" in the original
    await expect(
      instance.connect(cfo).distributeTokenPeriodic()
    ).to.be.revertedWith("Insufficient token balance");
  });
});