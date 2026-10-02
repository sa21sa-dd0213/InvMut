import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - maecf5ec5", function () {
  it("should allow non-owner to call sendTo (mutant bug: require(msg.sender != owner) instead of ==)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so transfers can succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10.0")
    });

    // In the original contract, this call from non-owner would revert.
    // In the mutant (require(msg.sender != owner)), this call from addr1 succeeds.
    await expect(
      instance.connect(addr1).sendTo(addr2.address, ethers.parseEther("1.0"))
    ).to.not.be.reverted;
  });
});