import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m96e28e3f detection", function () {
  it("should allow owner to withdraw all funds, but mutant reverts when owner calls", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ETH to the contract so there is balance to withdraw
    const depositAmount = ethers.parseEther("1.0");
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount,
    });

    // Owner attempts to withdraw all funds
    const tx = instance.connect(owner).withdrawAll(owner.address);

    // On the original contract, this should succeed (no revert).
    // On the mutant (where require(msg.sender != owner) is used), the owner calling will revert.
    await expect(tx).to.not.be.reverted;
  });
});