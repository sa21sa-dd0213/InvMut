import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant m3e20eaa2 test", function () {
  it("should kill the mutant by calling Command from Owner expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so multiplicate works if needed, but here we test Command
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call Command from the Owner - should succeed in original, revert in mutant
    const data = "0x";
    const tx = instance.connect(owner).Command(addr1.address, data, {
      value: ethers.parseEther("0.5")
    });

    // In the original contract, this should succeed (no revert)
    // In the mutant, require(msg.sender != Owner) fails for Owner, so it reverts
    await expect(tx).to.not.be.reverted;
  });
});