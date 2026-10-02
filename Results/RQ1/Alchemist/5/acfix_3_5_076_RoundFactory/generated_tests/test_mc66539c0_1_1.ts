import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when create() is called with roundImplementation not set (zero address)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory - no constructor arguments needed (uses OwnableUpgradeable with initialize)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the factory
    await instance.initialize();
    
    // Set up program operator
    await instance.connect(owner).updateProgramOperators(addr1.address, true);
    
    // Set alloSettings but NOT roundImplementation
    const mockAlloSettings = addr2.address;
    await instance.connect(owner).updateAlloSettings(mockAlloSettings);
    
    // Verify roundImplementation is still zero address
    expect(await instance.roundImplementation()).to.equal(ethers.ZeroAddress);
    
    // Attempt to create a round without roundImplementation being set
    // The original contract should revert with "roundImplementation is 0x"
    // The mutant (which removed the require check) would fail differently
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "string"],
      [owner.address, 100, "test"]
    );
    
    await expect(
      instance.connect(addr1).create(encodedParameters, addr1.address)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});