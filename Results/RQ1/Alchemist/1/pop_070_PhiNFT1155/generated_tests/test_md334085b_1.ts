import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - Mutant md334085b test", function () {
  it("should revert when claiming from a non-existent art ID (tokenId_ == 0) in claimFromFactory", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = addr1.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // The mutant removes the check `if (tokenId_ == 0)` replacing it with `if (false)`
    // This means the original contract would revert with InValdidTokenId() when claiming
    // from an art ID that hasn't been created (where tokenId_ == 0)
    
    // Test: Try to claim from an art ID that hasn't been created
    // Since no art has been created yet, any artId will map to tokenId_ == 0
    const nonExistentArtId = 999;
    const minter = addr1.address;
    const ref = ethers.ZeroAddress;
    const verifier = ethers.ZeroAddress;
    const quantity = 1;
    const data = ethers.ZeroHash;
    const imageURI = "";
    
    // This should revert in the original contract because tokenId_ == 0
    // The mutant would skip this check and proceed, likely failing elsewhere or minting incorrectly
    await expect(
      instance.connect(owner).claimFromFactory(
        nonExistentArtId,
        minter,
        ref,
        verifier,
        quantity,
        data,
        imageURI,
        { value: 0 }
      )
    ).to.be.reverted;
  });
});