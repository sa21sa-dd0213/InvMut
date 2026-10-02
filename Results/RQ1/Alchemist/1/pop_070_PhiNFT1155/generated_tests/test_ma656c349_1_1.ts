import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant ma656c349 test", function () {
  it("should allow token owner to transfer their own tokens without approval (kill mutant that changes != to ==)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 with constructor arguments (no constructor args in this case)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before any operations)
    await instance.initialize(
      1,                    // credChainId
      1,                    // credId
      "test",              // verificationType
      addr1.address        // protocolFeeDestination (any address)
    );
    
    // Get the phiFactoryContract address from the initialized contract
    const phiFactoryAddress = await instance.phiFactoryContract();
    
    // Create an art first (this requires ETH for the art fee)
    await instance.createArtFromFactory(1, { value: 0 });
    
    // Now token ID 1 should exist and be mapped to art ID 1
    const artId = 1;
    const tokenIdFromArt = await instance.getTokenIdFromFactoryArtId(artId);
    
    // Mint 1 token to owner
    await instance.claimFromFactory(
      artId,
      owner.address,  // minter
      ethers.ZeroAddress,  // ref
      ethers.ZeroAddress,  // verifier
      1,  // quantity
      ethers.ZeroHash,  // data
      ""  // imageURI
    );
    
    // Now owner has a token. Test the transfer:
    // Owner tries to transfer their own token to addr1
    // This should succeed in original but revert in mutant
    
    await expect(
      instance.safeTransferFrom(
        owner.address,  // from_
        addr1.address,  // to_
        tokenIdFromArt, // id_
        1,              // value_
        "0x"            // data_
      )
    ).to.not.be.reverted;
    
    // Verify the transfer happened
    expect(await instance.balanceOf(addr1.address, tokenIdFromArt)).to.equal(1);
  });
});