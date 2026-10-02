import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m2238d6ac - collateralFor exponentiation vs multiplication", function () {
  it("should compute correct collateral using exponentiation, not multiplication", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token with 18 decimals to use as collateral
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();

    // Deploy a mock debt token
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy the Cooler contract
    const CoolerFactory = await ethers.getContractFactory("Cooler");
    const cooler = await CoolerFactory.deploy();
    await cooler.waitForDeployment();

    // Test the collateralFor function
    // amount = 1000 tokens (in wei), loanToCollateral = 2 (meaning 2x collateral)
    const amount = ethers.parseEther("1000"); // 1000 tokens
    const loanToCollateral = 2;

    const collateral = await cooler.collateralFor(amount, loanToCollateral);

    // Expected calculation: (amount * (10 ** decimals())) / loanToCollateral
    // = (1000 * 10^18) / 2 = 500 * 10^18 = 500 ether worth of collateral
    const expectedCollateral = ethers.parseEther("500");

    // If the mutant is present (using multiplication instead of exponentiation):
    // (1000 * (10 * 18)) / 2 = (1000 * 180) / 2 = 90,000
    // This would be drastically different from the expected 500 ether
    
    expect(collateral).to.equal(expectedCollateral);
  });
});