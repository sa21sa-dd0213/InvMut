import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - collateral() return statement", function () {
  it("should detect mutant that removed return from collateral() by asserting returned address matches expected collateral token", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const MockERC20 = await ethers.getContractFactory("ERC20");
    const collateralToken = await MockERC20.deploy("Collateral", "COL", 18);
    const debtToken = await MockERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the owner
    const tx = await factory.generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const receipt = await tx.wait();

    // Get the cooler address from the factory mapping
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);

    // Attach to the Cooler contract
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Call collateral() and verify it returns the correct address (not zero)
    const returnedCollateral = await cooler.collateral();
    const expectedCollateral = await collateralToken.getAddress();

    // The mutant would return address(0) instead of the actual collateral address
    expect(returnedCollateral).to.equal(expectedCollateral);

    // Additional verification that it's not zero address (which would be the mutant behavior)
    expect(returnedCollateral).to.not.equal(ethers.ZeroAddress);
  });
});