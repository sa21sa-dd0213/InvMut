import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant mc5feba0d by calling Command from Owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so we can call Command with value
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner calls Command with some data and value - should succeed in original, revert in mutant
    const data = "0x1234";
    const tx = await instance.connect(owner).Command(addr1.address, data, { value: ethers.parseEther("0.5") });

    // On original contract this succeeds, on mutant it reverts because require(msg.sender != Owner) blocks the Owner
    await expect(tx).to.not.be.reverted;
  });
});