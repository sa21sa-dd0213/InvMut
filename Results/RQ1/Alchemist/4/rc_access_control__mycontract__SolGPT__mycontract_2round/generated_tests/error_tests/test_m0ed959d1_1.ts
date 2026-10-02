import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow sending to a non-zero address from owner and detect mutant that reverses the zero address check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1.0");
    
    // This should succeed on the original (receiver is non-zero)
    // On the mutant it will revert because mutant requires receiver == address(0)
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.not.be.reverted;
  });
});