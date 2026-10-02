import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mc6af19af - debt() return removal", function () {
  it("should return the debt token address from debt() function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the CoolerFactory (which deploys the Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get mock ERC20 tokens for testing
    const ERC20Mock = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Mock.deploy("Collateral", "COLL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for owner with collateral and debt tokens
    const tx = await factory.connect(owner).generateCooler(
      await collateral.getAddress(),
      await debt.getAddress()
    );
    const receipt = await tx.wait();

    // Get the cooler address from the mapping
    const coolerAddress = await factory.coolersFor(
      await collateral.getAddress(),
      await debt.getAddress(),
      0
    );

    // Attach to the Cooler contract
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Call debt() and verify it returns the expected debt token address
    const debtTokenAddress = await cooler.debt();
    expect(debtTokenAddress).to.equal(await debt.getAddress());
  });
});