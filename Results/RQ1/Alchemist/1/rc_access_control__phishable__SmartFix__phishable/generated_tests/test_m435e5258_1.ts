import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m435e5258", function () {
  it("should detect mutant that sets owner to address(0) in constructor", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with a non-zero address as _owner
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attempt to withdrawAll from the owner address (should succeed in original, fail in mutant)
    // In the mutant, owner is address(0), so this call will revert
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});