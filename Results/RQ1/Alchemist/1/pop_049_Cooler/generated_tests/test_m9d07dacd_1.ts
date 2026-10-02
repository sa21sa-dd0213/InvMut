import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m9d07dacd - clearRequest callback validation", function () {
    it("should revert when clearRequest is called with isCallback_=true from a non-callback contract", async function () {
        const [owner, lender] = await ethers.getSigners();
        
        // Deploy the CoolerFactory which deploys the Cooler implementation
        const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
        const factory = await CoolerFactory.deploy();
        await factory.waitForDeployment();
        
        // Deploy mock ERC20 tokens for collateral and debt
        const ERC20 = await ethers.getContractFactory("ERC20");
        const collateral = await ERC20.deploy("Collateral", "COL", 18);
        const debt = await ERC20.deploy("Debt", "DEBT", 18);
        await collateral.waitForDeployment();
        await debt.waitForDeployment();
        
        // Generate a cooler for the owner
        await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
        
        // Get the cooler address
        const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
        const coolerAddress = coolersFor[0];
        const cooler = await ethers.getContractAt("Cooler", coolerAddress);
        
        // Create a loan request first
        const amount = ethers.parseEther("100");
        const interest = ethers.parseEther("0.1");
        const loanToCollateral = ethers.parseEther("2");
        const duration = 30 * 24 * 60 * 60; // 30 days
        
        // Owner needs to have collateral tokens and approve
        await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));
        await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
        
        // Attempt to clear request with isCallback_=true from a non-callback address
        // This should revert in the original but not in the mutant
        await expect(
            cooler.connect(lender).clearRequest(0, false, true)
        ).to.be.revertedWith("NotCoolerCallback");
    });
});