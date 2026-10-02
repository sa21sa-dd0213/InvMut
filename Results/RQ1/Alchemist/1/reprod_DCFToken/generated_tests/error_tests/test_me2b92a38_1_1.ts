import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant me2b92a38 - buy restriction check", function () {
  it("should revert when buying from pair address (from == pairAddress) in original, but mutant allows it", async function () {
    const [owner, buyer] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = owner.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    const dcfAddress = await instance.getAddress();

    // Get the pair address from the deployed contract
    const pairAddress = await instance.pairAddress();

    // Transfer some tokens to the pair address to simulate it having tokens
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(pairAddress, transferAmount);

    const smallAmount = ethers.parseEther("1");

    // Get the impersonated signer for the pair address
    const pairAsSigner = await ethers.getImpersonatedSigner(pairAddress);

    // Fund the pair with some ETH for gas
    await owner.sendTransaction({
      to: pairAddress,
      value: ethers.parseEther("1")
    });

    // Try to transfer from pair to buyer - this should revert in original
    // because from == pairAddress triggers the "buy error" check
    await expect(
      instance.connect(pairAsSigner).transfer(buyer.address, smallAmount)
    ).to.be.reverted; // Original reverts with "buy error", mutant might not
  });
});