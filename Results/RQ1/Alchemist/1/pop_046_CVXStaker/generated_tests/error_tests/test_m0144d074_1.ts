import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker mutant kill test - onlyOperator modifier", function () {
    it("should revert when non-operator calls depositAndStake (kills mutant m0144d074)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy mock tokens and booster for constructor
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
        await clpToken.waitForDeployment();
        
        const MockBooster = await ethers.getContractFactory("MockBooster");
        const booster = await MockBooster.deploy();
        await booster.waitForDeployment();
        
        const rewardTokens = [addr2.address]; // dummy reward token address
        
        // Deploy CVXStaker
        const CVXStaker = await ethers.getContractFactory("CVXStaker");
        const staker = await CVXStaker.deploy(
            owner.address,      // operator
            clpToken.target,    // clpToken
            booster.target,     // booster
            rewardTokens        // rewardTokens
        );
        await staker.waitForDeployment();
        
        // Attempt to call depositAndStake from addr1 (not the operator)
        await expect(
            staker.connect(addr1).depositAndStake(ethers.parseEther("100"))
        ).to.be.revertedWithCustomError(staker, "NotOperator");
    });
});