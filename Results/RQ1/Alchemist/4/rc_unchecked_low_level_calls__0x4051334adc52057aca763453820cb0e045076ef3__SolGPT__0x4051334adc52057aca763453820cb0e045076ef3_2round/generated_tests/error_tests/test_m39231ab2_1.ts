import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kill mutant that changed > to >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a dummy token contract that the airdrop will call
    // Since the airdrop contract calls transferFrom on an arbitrary token address,
    // we need a token that will revert if called with empty _tos
    const dummyTokenFactory = await ethers.getContractFactory("DummyToken");
    const dummyToken = await dummyTokenFactory.deploy();
    await dummyToken.waitForDeployment();

    // Attempt to call transfer with empty _tos array - should revert on original
    await expect(
      instance.transfer(
        owner.address,
        await dummyToken.getAddress(),
        [], // empty _tos array
        ethers.parseEther("1")
      )
    ).to.be.reverted;
  });
});

// Helper contract to provide a target that will be called
// This is needed because the airdrop calls transferFrom on the caddress
contract DummyToken {
    function transferFrom(address, address, uint256) public pure returns (bool) {
        return true;
    }
}