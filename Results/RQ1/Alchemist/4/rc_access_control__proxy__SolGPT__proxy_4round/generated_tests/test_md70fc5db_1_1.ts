import { expect } from "chai";
import { ethers } from "hardhat";

describe("Proxy mutant detection test", function () {
  it("should revert when forwarding to a reverting contract, but mutant silently succeeds", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a simple contract that always reverts
    const ReverterFactory = await ethers.getContractFactory(
      "contract Reverter { function fail() external pure { revert('fail'); } }"
    );
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // Deploy the Proxy contract (no constructor arguments needed)
    const ProxyFactory = await ethers.getContractFactory("Proxy");
    const proxy = await ProxyFactory.deploy();
    await proxy.waitForDeployment();

    // Attempt to call the reverting function through the proxy
    const data = reverter.interface.encodeFunctionData("fail");

    // The original contract would revert here; the mutant would not
    await expect(
      proxy.forward(await reverter.getAddress(), data)
    ).to.be.reverted;
  });
});