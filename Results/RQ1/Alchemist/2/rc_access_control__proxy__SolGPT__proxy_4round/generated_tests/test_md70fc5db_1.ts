import { expect } from "chai";
import { ethers } from "hardhat";

describe("Proxy mutant md70fc5db - missing require(_s)", function () {
  it("should revert when forward is called with a failing external call, but mutant silently succeeds", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Proxy contract (constructor takes no arguments in this version)
    const ProxyFactory = await ethers.getContractFactory("Proxy");
    const proxy = await ProxyFactory.deploy();
    await proxy.waitForDeployment();
    
    // Deploy a simple contract that always reverts to simulate a failing call
    const ReverterFactory = await ethers.getContractFactory("contract Reverter { fallback() external { revert(); } }");
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();
    
    // Prepare data that will trigger the fallback (any bytes will do)
    const data = ethers.getBytes("0x12345678");
    
    // The call to forward should revert because the underlying call fails
    await expect(
      proxy.forward(await reverter.getAddress(), data)
    ).to.be.reverted;
  });
});