import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - distributeTokenPeriodic time restriction", function () {
  it("should revert when calling distributeTokenPeriodic twice in quick succession due to cooldown period", async function () {
    const [owner, cfo, liquidityReceive, distributeAddr] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceive.address);
    await dcf.waitForDeployment();
    
    // Set the CFO (caller) address
    await dcf.connect(owner).setCaller(cfo.address);
    
    // Set the distribute address
    await dcf.connect(cfo).setDistributeAddress(distributeAddr.address);
    
    // Ensure contract has enough tokens to distribute
    // Owner has initial supply, we can transfer some to the contract
    const contractBalance = await dcf.balanceOf(await dcf.getAddress());
    const distributeAmount = ethers.parseEther("2000");
    
    if (contractBalance < distributeAmount) {
      await dcf.connect(owner).transfer(await dcf.getAddress(), distributeAmount);
    }
    
    // First call should succeed
    await dcf.connect(owner).distributeTokenPeriodic();
    
    // Second immediate call should revert due to cooldown (nowTime + 64800)
    await expect(
      dcf.connect(owner).distributeTokenPeriodic()
    ).to.be.revertedWith("Not within the execution time range");
  });
});