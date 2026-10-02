import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract - kill mutant m86a121b3", function () {
  it("should succeed when calling transfer with a valid non-zero contract_address (mutant requires zero address, causing revert)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const instance = await AirDropFactory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();
    
    // Deploy a second AirDropContract instance to use as a valid contract_address
    // This ensures we have a real contract address that is not address(0) and not address(this)
    const secondFactory = await ethers.getContractFactory("AirDropContract");
    const token = await secondFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    // Prepare test data: one recipient with amount
    const tos = [addr1.address];
    const vs = [100];
    
    // In the original contract, this should succeed (valid non-zero, non-self address)
    // In the mutant, it should revert because the first check requires addr == address(0x0)
    // which fails for any real contract address
    await expect(
      instance.connect(owner).transfer(tokenAddress, tos, vs)
    ).to.not.be.reverted;
    
    // Verify the transaction actually succeeded by checking return value
    const tx = await instance.connect(owner).transfer(tokenAddress, tos, vs);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });
});