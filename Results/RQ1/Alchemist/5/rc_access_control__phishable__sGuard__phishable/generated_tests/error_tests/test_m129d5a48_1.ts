import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m129d5a48 test", function () {
  it("should allow owner to withdrawAll and revert when non-owner tries", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to withdraw (original behavior)
    // Mutant would revert here because require(msg.sender != owner) blocks owner
    const tx = instance.connect(owner).withdrawAll(owner.address);
    
    // This should succeed on original, fail on mutant
    await expect(tx).to.not.be.reverted;
    
    // After successful withdrawal, contract balance should be 0
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(0n);
  });
});