import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls delegateVoting (mutant md6a57499)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler via the factory
    await factory.connect(addr1).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];

    // Get the Cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Attempt to call delegateVoting from a non-owner address (addr2)
    // This should revert in the original contract because msg.sender != owner()
    await expect(
      cooler.connect(addr2).delegateVoting(addr2.address)
    ).to.be.revertedWith("OnlyApproved");
  });
});