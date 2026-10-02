import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant detection - owner() function", function () {
  it("should return the correct owner address for a cloned Cooler contract", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the CoolerFactory which will create clones
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get the Cooler implementation address from the factory
    const coolerImplAddress = await factory.coolerImplementation();

    // Create mock ERC20 tokens for testing
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner with these tokens
    const tx = await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const receipt = await tx.wait();

    // Get the cooler address from the event
    const event = receipt.logs.find(log => {
      try {
        return factory.interface.parseLog(log)?.name === "RequestLoan";
      } catch {
        return false;
      }
    });
    
    // Alternatively, we can get the cooler from the factory mapping
    // Since we can't easily query the mapping, let's get it from the coolerFor mapping
    // We'll need to deploy a simple contract to interact or use the events
    
    // For this test, let's use a different approach - deploy a minimal clone manually
    // to test the owner() function directly
    
    // Deploy a minimal test that creates a clone using the ClonesWithImmutableArgs library
    const CloneFactory = await ethers.getContractFactory("ClonesWithImmutableArgs");
    const cloneLib = await CloneFactory.deploy();
    await cloneLib.waitForDeployment();
    
    // We need to test the owner() function on a clone created through the factory
    // Let's generate a cooler and test its owner()
    
    // Since we need the cooler address, let's check the coolersFor array
    const coolersList = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    
    // If there's at least one cooler, test it
    if (coolersList.length > 0) {
      const coolerAddress = coolersList[0];
      const cooler = await ethers.getContractAt("Cooler", coolerAddress);
      
      // Get the owner from the cooler
      const coolerOwner = await cooler.owner();
      
      // The owner should be the address that generated the cooler
      expect(coolerOwner).to.equal(owner.address);
    } else {
      // Fallback: test that owner() returns a non-zero address
      // We'll deploy a clone directly using the ClonesWithImmutableArgs approach
      
      // Get the Cooler bytecode
      const Cooler = await ethers.getContractFactory("Cooler");
      const coolerBytecode = Cooler.bytecode;
      
      // Create clone data with owner address
      const cloneData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "address", "address"],
        [owner.address, await collateral.getAddress(), await debt.getAddress(), await factory.getAddress()]
      );
      
      // Use the factory to generate the cooler
      const tx2 = await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
      await tx2.wait();
      
      // Get the cooler address
      const coolersList2 = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
      expect(coolersList2.length).to.be.greaterThan(0);
      
      const coolerAddress2 = coolersList2[coolersList2.length - 1];
      const cooler2 = await ethers.getContractAt("Cooler", coolerAddress2);
      
      // Test that owner() returns the correct address
      const returnedOwner = await cooler2.owner();
      expect(returnedOwner).to.equal(owner.address);
    }
  });
});