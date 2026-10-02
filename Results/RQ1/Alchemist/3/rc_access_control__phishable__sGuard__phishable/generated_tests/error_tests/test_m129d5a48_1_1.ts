import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant kill test - withdrawAll authorization", function () {
  it("should revert when owner calls withdrawAll on the mutant (due to != check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with owner as the constructor argument
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ETH to the contract so withdrawAll has a balance to transfer
    const txFund = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await txFund.wait();

    // Owner tries to withdraw - should revert on mutant (require(msg.sender != owner) fails)
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});