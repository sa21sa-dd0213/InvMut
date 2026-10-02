import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - onlyOwner modifier removed", function () {
  it("should revert when non-owner tries to call withdrawAll after modifier is removed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the wallet first so there's balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to call withdrawAll - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});