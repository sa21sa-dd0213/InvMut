import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0ed959d1 by verifying successful transfer to non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = addr1.address;
    const amount = ethers.parseEther("1.0");

    // Record balance before transfer
    const balanceBefore = await ethers.provider.getBalance(receiver);

    // Execute transfer from owner to non-zero address
    await instance.connect(owner).sendTo(receiver, amount);

    // Check that balance increased - this will fail on mutant because it requires receiver == address(0)
    const balanceAfter = await ethers.provider.getBalance(receiver);
    expect(balanceAfter).to.equal(balanceBefore + amount);
  });
});