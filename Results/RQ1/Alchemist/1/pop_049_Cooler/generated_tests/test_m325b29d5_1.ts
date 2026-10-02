import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - collateralFor division replaced with addition", function () {
  it("should kill mutant m325b29d5 by verifying collateralFor returns correct division result", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token to use as collateral
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await ERC20Mock.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    
    // Deploy a mock ERC20 token to use as debt
    const debtToken = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();
    
    // Deploy CoolerFactory first (needed for Cooler deployment)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate cooler for owner with the two tokens
    await factory.connect(owner).generateCooler(collateralToken.target, debtToken.target);
    const coolerAddress = await factory.coolerFor(owner.address, collateralToken.target, debtToken.target);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Test the collateralFor function with specific values
    // Original: (amount_ * 10**decimals) / loanToCollateral_
    // Mutant:   (amount_ * 10**decimals) + loanToCollateral_
    
    const amount = ethers.parseEther("100"); // 100 tokens
    const loanToCollateral = 200; // 200% LTC ratio
    
    const result = await cooler.collateralFor(amount, loanToCollateral);
    
    // Expected result: (100 * 10^18) / 200 = 5 * 10^17 = 0.5 ether
    const expectedResult = ethers.parseEther("0.5");
    
    // Mutant would return: (100 * 10^18) + 200 = 100000000000000000200
    // This assertion will pass on original but fail on mutant
    expect(result).to.equal(expectedResult);
  });
});