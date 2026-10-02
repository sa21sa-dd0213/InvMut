import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant maec7a2dc test", function () {
  it("should kill mutant by deploying with non-zero owner and calling withdrawAll from that owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with a non-zero owner address
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // On original: owner can withdraw. On mutant: owner is address(0), so this should revert
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});