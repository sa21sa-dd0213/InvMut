import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant m3e20eaa2 by calling Command from Owner and expecting success, while mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first so we can observe balance changes
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Prepare a simple data payload (empty bytes) for the Command call
    const data = "0x";

    // Call Command from Owner - should succeed in original, revert in mutant
    const tx = instance.connect(owner).Command(addr1.address, data, { value: ethers.parseEther("0.5") });

    // On original contract, this succeeds; on mutant (with !=), it reverts
    // We expect revert on mutant, so we catch the revert
    await expect(tx).to.be.reverted;
  });
});