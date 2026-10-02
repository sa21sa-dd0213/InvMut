import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - router address mutation", function () {
  it("should revert when swapping tokens through the mutated router address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with a valid liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Get the router address from the deployed contract
    const routerAddress = await instance.router();

    // The mutant sets router = USDT address (0x55d398326f99059fF775485246999027B3197955)
    // This should not be a valid Uniswap router
    // Verify the router is set to the USDT address (mutant) not the real router
    const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
    expect(routerAddress).to.equal(USDT_ADDRESS);

    // Attempt to trigger a swap - this should fail because USDT is not a router
    // We need to trigger the swapTokensForUSDT function which is called during _transfer
    // First, set up white address to bypass checks
    // Note: Need to set the caller first since setWhite requires onlyCaller modifier
    await instance.setCaller(owner.address);
    await instance.setWhite(addr1.address, true);

    // Transfer some tokens to addr1
    await instance.transfer(addr1.address, ethers.parseEther("1000"));

    // Remove addr1 from whitelist to trigger the swap logic on transfer
    await instance.setWhite(addr1.address, false);

    // Try to transfer tokens to pair address to trigger swap
    // This should revert because the router is actually the USDT token address
    await expect(
      instance.connect(addr1).transfer(
        await instance.pairAddress(),
        ethers.parseEther("100")
      )
    ).to.be.reverted;
  });
});