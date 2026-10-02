import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m316a4fdd - adjustTransferability access control", function () {
  it("should revert when non-owner calls adjustTransferability", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with required constructor arguments
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();
    
    // First, create a game item so we have a tokenId to test with
    await instance.createGameItem(
      "Test Item",
      "ipfs://test",
      true,  // finiteSupply
      true,  // transferable
      100,   // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10     // dailyAllowance
    );
    
    // Attempt to call adjustTransferability from a non-owner address
    // The original contract should revert with "require(msg.sender == _ownerAddress)"
    // The mutant removes this check, so the call would succeed (which is wrong)
    await expect(
      instance.connect(addr1).adjustTransferability(0, false)
    ).to.be.reverted;
  });
});