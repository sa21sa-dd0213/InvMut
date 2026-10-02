import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mdc48c3c2 by triggering out-of-bounds access in safeBatchTransferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item first
    await instance.createGameItem(
      "TestItem",
      "ipfs://test",
      false, // finiteSupply = false
      true,  // transferable = true
      100,
      ethers.parseEther("1"),
      10
    );

    // Mint some tokens to addr1
    await instance.connect(addr1).mint(0, 5, {
      value: 0
    });

    // Approve operator for addr1
    await instance.connect(addr1).setApprovalForAll(addr2.address, true);

    // Create arrays for batch transfer
    const ids = [0];
    const amounts = [1];

    // The mutant changes i < ids.length to i <= ids.length
    // This will cause an out-of-bounds access when i equals ids.length
    // Original: should succeed with valid transfer
    // Mutant: should revert with out-of-bounds error
    await expect(
      instance.connect(addr2).safeBatchTransferFrom(
        addr1.address,
        addr2.address,
        ids,
        amounts,
        "0x"
      )
    ).to.be.reverted;
  });
});