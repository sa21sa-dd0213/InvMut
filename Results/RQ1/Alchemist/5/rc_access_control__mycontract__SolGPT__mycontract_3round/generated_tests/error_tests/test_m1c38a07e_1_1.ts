import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1c38a07e by calling sendTo with a positive amount and expecting success, while mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 wei to addr1 - should succeed on original but revert on mutant (amount < 0)
    const tx = await instance.connect(owner).sendTo(addr1.address, 1);
    await expect(tx).to.not.be.reverted;
  });
});