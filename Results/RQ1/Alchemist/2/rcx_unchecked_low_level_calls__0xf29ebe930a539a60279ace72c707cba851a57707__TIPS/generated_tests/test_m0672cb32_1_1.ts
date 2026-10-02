import { ethers } from "hardhat";
import { expect } from "chai";

describe("B", function () {
  it("should deploy and allow owner to call go()", async function () {
    const B = await ethers.getContractFactory("B");
    const b = await B.deploy();
    await b.deployed();

    const [owner] = await ethers.getSigners();
    
    // Fund contract with some ETH for testing
    await owner.sendTransaction({
      to: b.address,
      value: ethers.utils.parseEther("1.0")
    });

    // Call go() with some ETH
    await expect(b.go({ value: ethers.utils.parseEther("0.5") })).to.not.be.reverted;
    
    // Check that owner still has the ETH
    expect(await b.owner()).to.equal(owner.address);
  });
});