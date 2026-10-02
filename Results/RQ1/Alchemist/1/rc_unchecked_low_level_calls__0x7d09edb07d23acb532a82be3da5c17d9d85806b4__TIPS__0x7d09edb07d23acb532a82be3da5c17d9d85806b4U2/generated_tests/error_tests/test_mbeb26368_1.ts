import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mbeb26368 - Donate event emission", function () {
  it("should emit Donate event when donate is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const whaleAddress = addr2.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await instance.OpenToThePublic();
    
    // Fund the contract with some ether for donation
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Call donate from addr1 and verify the Donate event is emitted
    const donateAmount = ethers.parseEther("5");
    const donateTx = await instance.connect(addr1).donate({ value: donateAmount });
    const receipt = await donateTx.wait();
    
    // Verify the Donate event was emitted with correct parameters
    await expect(donateTx)
      .to.emit(instance, "Donate")
      .withArgs(donateAmount, whaleAddress, addr1.address);
  });
});