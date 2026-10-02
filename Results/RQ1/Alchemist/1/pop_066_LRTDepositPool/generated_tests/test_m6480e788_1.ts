import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LRTDepositPool, LRTConfig, RSETH } from "../typechain-types";

describe("LRTDepositPool - pause access control", function () {
    let owner: SignerWithAddress;
    let manager: SignerWithAddress;
    let unauthorizedUser: SignerWithAddress;
    let lrtDepositPool: LRTDepositPool;
    let lrtConfig: LRTConfig;
    let rsethToken: RSETH;

    beforeEach(async function () {
        [owner, manager, unauthorizedUser] = await ethers.getSigners();

        // Deploy LRTConfig
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();

        // Deploy RSETH token
        const RSETHFactory = await ethers.getContractFactory("RSETH");
        rsethToken = await RSETHFactory.deploy();
        await rsethToken.waitForDeployment();

        // Set RSETH token in LRTConfig
        const R_ETH_TOKEN = ethers.keccak256(ethers.toUtf8Bytes("R_ETH_TOKEN"));
        await lrtConfig.setToken(R_ETH_TOKEN, await rsethToken.getAddress());

        // Grant MANAGER role to manager address
        const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
        await lrtConfig.grantRole(MANAGER_ROLE, manager.address);

        // Deploy LRTDepositPool
        const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
        lrtDepositPool = await LRTDepositPoolFactory.deploy();
        await lrtDepositPool.waitForDeployment();

        // Initialize LRTDepositPool with LRTConfig address
        await lrtDepositPool.initialize(await lrtConfig.getAddress());
    });

    it("should revert when unauthorized user tries to pause the contract", async function () {
        // Attempt to call pause from unauthorized address - should revert in original but succeed in mutant
        await expect(
            lrtDepositPool.connect(unauthorizedUser).pause()
        ).to.be.revertedWith("CallerNotLRTConfigManager");
    });
});