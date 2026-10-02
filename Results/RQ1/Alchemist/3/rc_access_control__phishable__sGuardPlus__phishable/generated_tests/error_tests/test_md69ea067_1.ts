import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant md69ea067 test", function () {
  it("should revert when intended owner calls withdrawAll because contract incorrectly sets owner to itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with owner as the intended owner
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to withdraw as the intended owner - should succeed on original,
    // but revert on mutant because owner is set to contract address
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});