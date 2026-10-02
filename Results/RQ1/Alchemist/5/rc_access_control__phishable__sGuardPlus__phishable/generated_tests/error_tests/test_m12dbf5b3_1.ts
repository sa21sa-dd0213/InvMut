import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m12dbf5b3", function () {
  it("should revert when original owner tries to withdraw because owner is address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with owner as the signer address (non-zero address)
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Send some ETH to the contract so withdrawAll has a balance to transfer
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // Attempt to withdrawAll as the original owner - should revert in mutant
    // because owner is address(0), not the caller
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});