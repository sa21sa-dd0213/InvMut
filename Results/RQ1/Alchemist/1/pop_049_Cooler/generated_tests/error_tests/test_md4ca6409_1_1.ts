import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant md4ca6409 test", function () {
    let coolerFactory: any;
    let cooler: any;
    let owner: any;
    let lender: any;
    let mockCallback: any;
    let collateral: any;
    let debt: any;

    before(async function () {
        [owner, lender] = await ethers.getSigners();

        // Deploy mock ERC20 tokens for collateral and debt
        const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
        collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
        debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
        await collateral.waitForDeployment();
        await debt.waitForDeployment();

        // Deploy CoolerFactory
        const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
        coolerFactory = await CoolerFactoryFactory.deploy();
        await coolerFactory.waitForDeployment();

        // Deploy a mock callback contract that returns true for isCoolerCallback()
        const MockCallbackFactory = await ethers.getContractFactory("MockCoolerCallback");
        mockCallback = await MockCallbackFactory.deploy(await coolerFactory.getAddress());
        await mockCallback.waitForDeployment();

        // Generate a cooler for owner
        await coolerFactory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
        
        // Get the cooler address
        const coolerAddress = await coolerFactory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
        cooler = await ethers.getContractAt("Cooler", coolerAddress);
    });

    it("should allow a legitimate callback contract to clear a request with isCallback_=true (kills mutant md4ca6409)", async function () {
        // Owner creates a loan request
        const amount = ethers.parseEther("1000");
        const interest = ethers.parseEther("0.05"); // 5%
        const loanToCollateral = ethers.parseEther("2"); // 2x collateral
        const duration = 30 * 24 * 60 * 60; // 30 days

        // First, owner needs to approve and provide collateral
        const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
        await collateral.connect(owner).approve(await cooler.getAddress(), collateralAmount);
        await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

        // Get the request ID
        const request = await cooler.getRequest(0);
        expect(request.active).to.be.true;

        // Lender (callback contract) needs debt tokens to clear the request
        const debtAmount = amount;
        await debt.connect(lender).approve(await cooler.getAddress(), debtAmount);
        
        // Now lender (which is the mock callback contract) tries to clear with isCallback_=true
        // This should succeed in the original but fail in the mutant
        await expect(
            cooler.connect(mockCallback).clearRequest(0, false, true)
        ).to.not.be.reverted;

        // Verify the loan was created
        const loan = await cooler.getLoan(0);
        expect(loan.lender).to.equal(await mockCallback.getAddress());
    });
});