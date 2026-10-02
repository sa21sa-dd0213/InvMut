import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m43682e14: require(_tos.length > 0) replaced with require(_tos.length < 0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The mutated require(_tos.length < 0) will always revert since array length is never negative
    // A call with valid non-empty array should succeed on original but fail on mutant
    await expect(
      instance.connect(owner).transfer(
        [addr1.address], // _tos array with one element (length > 0)
        [1]             // v array with corresponding value
      )
    ).to.not.be.reverted;
    
    // Verify the transaction actually succeeded
    const tx = await instance.connect(owner).transfer(
      [addr1.address],
      [1]
    );
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });
});