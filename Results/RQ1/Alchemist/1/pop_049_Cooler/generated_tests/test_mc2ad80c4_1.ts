import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - approveTransfer access control", function () {
    it("should revert when non-lender calls approveTransfer", async function () {
        const [owner, lender, unauthorized] = await ethers.getSigners();
        
        // Deploy CoolerFactory first (it deploys Cooler implementation)
        const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
        const factory = await CoolerFactory.deploy();
        await factory.waitForDeployment();
        
        // Deploy mock ERC20 tokens for collateral and debt
        const ERC20 = await ethers.getContractFactory("ERC20");
        const collateral = await ERC20.deploy("Collateral", "COL", 18);
        const debt = await ERC20.deploy("Debt", "DEBT", 18);
        await collateral.waitForDeployment();
        await debt.waitForDeployment();
        
        // Owner generates a cooler
        await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
        
        // Get the cooler address
        const coolerAddress = await factory.coolersFor(
            await collateral.getAddress(), 
            await debt.getAddress(), 
            0
        );
        
        const Cooler = await ethers.getContractFactory("Cooler");
        const cooler = Cooler.attach(coolerAddress);
        
        // Owner creates a loan request
        const amount = ethers.parseEther("100");
        const interest = ethers.parseEther("0.05");
        const loanToCollateral = 2000; // 2000%
        const duration = 30 * 24 * 60 * 60; // 30 days
        
        // Transfer collateral to owner for request
        await collateral.mint(owner.address, ethers.parseEther("1000"));
        await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));
        
        await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
        
        // Lender clears the request
        await debt.mint(lender.address, ethers.parseEther("1000"));
        await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
        
        await cooler.connect(lender).clearRequest(0, false, false);
        
        // Unauthorized user tries to approve transfer of the loan
        await expect(
            cooler.connect(unauthorized).approveTransfer(addr2.address, 0)
        ).to.be.revertedWithCustomError(cooler, "OnlyApproved");
    });
});