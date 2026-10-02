import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mfb8999b4 test", function () {
    it("should revert when unauthorized caller tries to transferOwnership", async function () {
        const [owner, lender, unauthorized] = await ethers.getSigners();
        
        // Deploy CoolerFactory first (required to create Cooler instances)
        const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
        const factory = await CoolerFactory.deploy();
        await factory.waitForDeployment();
        
        // Deploy mock ERC20 tokens for collateral and debt
        const ERC20 = await ethers.getContractFactory("ERC20");
        const collateral = await ERC20.deploy("Collateral", "COL", 18);
        await collateral.waitForDeployment();
        const debt = await ERC20.deploy("Debt", "DEBT", 18);
        await debt.waitForDeployment();
        
        // Generate a cooler through the factory
        await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
        const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
        const cooler = await ethers.getContractAt("Cooler", coolerAddress);
        
        // Create a loan first (needed to have a loanID for transferOwnership)
        const loanAmount = ethers.parseEther("1000");
        const interest = ethers.parseEther("0.1");
        const loanToCollateral = ethers.parseEther("2");
        const duration = 7 * 24 * 60 * 60; // 7 days
        
        // Owner needs to have collateral tokens
        const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);
        await collateral.connect(owner).mint(await owner.getAddress(), collateralNeeded);
        await collateral.connect(owner).approve(await cooler.getAddress(), collateralNeeded);
        
        // Request a loan
        await cooler.connect(owner).requestLoan(loanAmount, interest, loanToCollateral, duration);
        
        // Lender clears the request
        await debt.connect(lender).mint(await lender.getAddress(), loanAmount);
        await debt.connect(lender).approve(await cooler.getAddress(), loanAmount);
        await cooler.connect(lender).clearRequest(0, false, false);
        
        // Now approve unauthorized address for transfer of loan 0
        await cooler.connect(lender).approveTransfer(await unauthorized.getAddress(), 0);
        
        // Attempt to transfer ownership from unauthorized address
        // The original contract should revert with OnlyApproved
        // The mutant removes the revert, so this would succeed (and the test should fail)
        await expect(
            cooler.connect(unauthorized).transferOwnership(0)
        ).to.be.revertedWith("OnlyApproved");
    });
});