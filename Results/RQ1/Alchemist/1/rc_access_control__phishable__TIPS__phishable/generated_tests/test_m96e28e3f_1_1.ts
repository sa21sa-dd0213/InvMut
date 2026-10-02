import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection test", function () {
  it("should detect mutant m96e28e3f by checking owner can withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ETH to the contract for withdrawal
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to withdraw all funds successfully
    // In the mutant, this will revert because require(msg.sender != owner) fails for owner
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.not.be.reverted;
  });
});