import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m5e1a9fed - factory() return value", function () {
  it("should detect mutant by verifying factory() returns a non-zero address matching the CoolerFactory", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy CoolerFactory first (it deploys Cooler implementation internally)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get the cooler implementation address from the factory
    const coolerImplementation = await factory.coolerImplementation();

    // Generate a cooler for the owner using some mock ERC20 tokens
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate the cooler
    const tx = await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const receipt = await tx.wait();

    // Get the cooler address from the event
    const event = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === "RequestLoan";
      } catch {
        return false;
      }
    });
    
    // Alternatively, we can compute the cooler address using the clone mechanism
    // For simplicity, let's call the factory's coolersFor mapping
    const coolerAddress = (await factory.coolersFor(await collateral.getAddress(), await debt.getAddress()))[0];
    
    // Attach to the cooler as a Cooler contract
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Call factory() on the cooler - this is the mutated function
    const returnedFactory = await cooler.factory();

    // The mutant removes the return statement, so the function will return 0x0 instead
    // Verify that the returned address is non-zero and matches the actual factory
    expect(returnedFactory).to.not.equal(ethers.ZeroAddress);
    expect(returnedFactory).to.equal(await factory.getAddress());
  });
});