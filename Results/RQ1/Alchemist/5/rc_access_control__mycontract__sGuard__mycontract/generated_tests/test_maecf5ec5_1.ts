import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection test", function () {
  it("should revert when owner calls sendTo (mutant changes require to msg.sender != owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1.0");
    
    // On the original contract, owner can call sendTo successfully
    // On the mutant, require(msg.sender != owner) will cause revert for owner
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});