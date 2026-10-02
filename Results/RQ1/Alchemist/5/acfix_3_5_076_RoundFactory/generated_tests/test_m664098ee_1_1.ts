import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m664098ee - updateRoundImplementation", function () {
  let owner: any;
  let addr1: any;
  let roundImplementation: any;
  let alloSettings: any;
  let factory: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy a mock implementation contract that has initialize function
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    roundImplementation = await RoundImplementation.deploy();
    await roundImplementation.waitForDeployment();

    // Deploy AlloSettings mock
    const AlloSettings = await ethers.getContractFactory("AlloSettings");
    alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();

    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initialize the factory
    await factory.initialize();
  });

  it("should set roundImplementation correctly and allow clone creation", async function () {
    // Set program operator role for owner
    await factory.setProgramOperator(owner.address, true);

    // Update round implementation with a valid contract address
    await factory.updateRoundImplementation(roundImplementation.target);

    // Update alloSettings
    await factory.updateAlloSettings(alloSettings.target);

    // Prepare encoded parameters for initialize
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "string"],
      [owner.address, 100, "test"]
    );

    // Call create - should succeed with original code, fail with mutant
    const tx = factory.create(encodedParams, owner.address);

    // The mutant will set roundImplementation to address(this) which is the factory
    // This means ClonesUpgradeable.clone will create a proxy pointing to factory
    // which doesn't have initialize function, causing revert
    await expect(tx).to.not.be.reverted;

    // Verify the created clone address is not the factory itself
    const receipt = await (await tx).wait();
    const event = receipt.logs[0];
    const decodedEvent = factory.interface.parseLog(event);
    const cloneAddress = decodedEvent.args.roundAddress;

    // The clone should be a different contract, not the factory
    expect(cloneAddress).to.not.equal(factory.target);

    // Verify the clone actually has the implementation code (is a contract)
    const code = await ethers.provider.getCode(cloneAddress);
    expect(code).to.not.equal("0x");
  });
});