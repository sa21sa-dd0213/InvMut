import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mc82a2b28 - collateralFor exponentiation bug", function () {
  it("should detect the mutant by comparing collateralFor result with expected value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the Cooler contract (no constructor arguments as per the actual contract)
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = await Cooler.deploy();
    await cooler.waitForDeployment();

    // Since Cooler is a clone-based contract, we need to deploy it through the factory
    // First deploy the factory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Generate a cooler through the factory
    await factory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address for this owner
    const coolersFor = await factory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const coolerAddress = coolersFor[0];
    const coolerInstance = await ethers.getContractAt("Cooler", coolerAddress);

    // Test case: call collateralFor with specific values and verify result
    const amount = ethers.parseEther("100"); // 100 tokens
    const loanToCollateral = 2000; // 2000 LTV ratio

    const result = await coolerInstance.collateralFor(amount, loanToCollateral);

    // Expected: (100 * 10^18) / 2000 = 100 * 10^18 / 2000
    const expected = (amount * BigInt(10 ** 18)) / BigInt(loanToCollateral);

    // If the mutant is present (exponentiation instead of multiplication),
    // the result would be astronomically larger (100 ** 10^18 / 2000)
    // which would either overflow or produce a completely different value
    expect(result).to.equal(expected);
  });
});